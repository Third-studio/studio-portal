content = open('src/App.js').read()

old = 'export default function App() {\n  // Global state\n  const[appView,setAppView]=useState("prod");'

new = '''export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
  }, []);

  if (authLoading) return <div style={{minHeight:"100vh",background:"#08080F",display:"flex",alignItems:"center",justifyContent:"center",color:"#E8C547",fontSize:28}}>Chargement...</div>;
  if (!user) return <Login onLogin={setUser} />;

  // Global state
  const[appView,setAppView]=useState("prod");'''

if old in content:
    content = content.replace(old, new)
    open('src/App.js', 'w').write(content)
    print('Done!')
else:
    print('Pattern not found')
